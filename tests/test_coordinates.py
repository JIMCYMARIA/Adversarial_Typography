import fitz
import pytest

from backend.coordinates import bbox_to_rendered, rendered_page_size


@pytest.mark.parametrize("width,height,rotation", [
    (612, 792, 0),
    (792, 612, 0),
    (420, 700, 90),
    (1000, 400, 270),
    (300, 300, 180),
])
def test_bbox_transform_stays_aligned_to_rendered_page(width, height, rotation):
    doc=fitz.open()
    page=doc.new_page(width=width,height=height)
    page.insert_text((50,100),"coordinate probe",fontsize=12)
    page.set_rotation(rotation)
    span=page.get_text("dict")["blocks"][0]["lines"][0]["spans"][0]
    x0,y0,x1,y1=bbox_to_rendered(page,span["bbox"])
    page_width,page_height=rendered_page_size(page)
    assert 0<=x0<x1<=page_width+1
    assert 0<=y0<y1<=page_height+1
    scale=1.5
    pix=page.get_pixmap(matrix=fitz.Matrix(scale,scale),alpha=False)
    assert abs(pix.width/scale-page_width)<=1
    assert abs(pix.height/scale-page_height)<=1
    left=max(0,int(x0*scale)); right=min(pix.width,int(x1*scale)+1)
    top=max(0,int(y0*scale)); bottom=min(pix.height,int(y1*scale)+1)
    pixels=pix.samples; channels=pix.n
    assert any(max(pixels[(y*pix.width+x)*channels:(y*pix.width+x)*channels+3])<160
               for y in range(top,bottom) for x in range(left,right))
    doc.close()


def test_coordinate_transform_selects_correct_page_in_multipage_document():
    doc=fitz.open()
    first=doc.new_page(width=612,height=792)
    first.insert_text((40,80),"page one probe",fontsize=12)
    second=doc.new_page(width=900,height=400)
    second.insert_text((60,120),"page two probe",fontsize=12)
    second.set_rotation(270)
    for index,needle in ((0,"page one probe"),(1,"page two probe")):
        page=doc[index]
        span=next(s for b in page.get_text("dict")["blocks"] for line in b.get("lines",[]) for s in line["spans"] if needle in s["text"])
        x0,y0,x1,y1=bbox_to_rendered(page,span["bbox"])
        width,height=rendered_page_size(page)
        assert 0<=x0<x1<=width+1 and 0<=y0<y1<=height+1
        assert page.number==index
    doc.close()
